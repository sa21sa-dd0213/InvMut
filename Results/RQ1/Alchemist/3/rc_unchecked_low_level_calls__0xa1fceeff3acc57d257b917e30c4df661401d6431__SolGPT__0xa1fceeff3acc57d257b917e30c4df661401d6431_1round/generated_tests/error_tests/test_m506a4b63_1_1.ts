import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m506a4b63 test", function () {
  it("should detect mutant that changes loop condition from < to >", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy AirDropContract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use with transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Owner approves AirDropContract to transfer tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare transfer parameters
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("10")];

    // Record balances before transfer
    const balanceBefore = await token.balanceOf(addr1.address);

    // Execute transfer
    await instance.transfer(await token.getAddress(), recipients, amounts);

    // Check balance after - mutant loop never executes, so balance should be unchanged
    const balanceAfter = await token.balanceOf(addr1.address);

    // Original contract would transfer tokens, mutant does not
    expect(balanceAfter).to.equal(balanceBefore);
  });
});