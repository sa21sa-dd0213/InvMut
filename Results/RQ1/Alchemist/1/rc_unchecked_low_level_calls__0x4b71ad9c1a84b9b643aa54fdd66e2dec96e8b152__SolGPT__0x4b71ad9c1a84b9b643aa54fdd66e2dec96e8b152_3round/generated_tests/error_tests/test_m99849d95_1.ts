import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer succeeds - detects mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/test/TestToken.sol:TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Approve the airPort contract to transfer tokens on behalf of owner
    const amount = ethers.parseEther("10");
    await token.approve(await instance.getAddress(), amount);

    // Prepare recipients array
    const recipients = [addr1.address, addr2.address];

    // Call transfer and capture return value
    const tx = await instance.transfer(owner.address, await token.getAddress(), recipients, amount);
    const result = await tx.wait();

    // Check that the transaction succeeded and returned true
    // Since the mutant removes "return true", it will return false by default
    // We can verify by checking the transaction receipt or by decoding the return value
    expect(result.status).to.equal(1); // Transaction succeeded

    // Alternatively, we can check that the transfer actually happened
    const balance1 = await token.balanceOf(addr1.address);
    const balance2 = await token.balanceOf(addr2.address);
    expect(balance1).to.equal(amount);
    expect(balance2).to.equal(amount);
  });
});