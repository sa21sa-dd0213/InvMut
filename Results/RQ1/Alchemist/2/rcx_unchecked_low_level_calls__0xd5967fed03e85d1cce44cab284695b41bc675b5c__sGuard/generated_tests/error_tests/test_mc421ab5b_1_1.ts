import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc421ab5b - missing return true", function () {
  it("should return true when transfer function executes successfully", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like token for testing
    const TokenFactory = await ethers.getContractFactory("demo");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Call transfer with valid inputs
    const recipients = [addr1.address, addr2.address];
    const amount = ethers.parseEther("1");
    
    const tx = await instance.transfer(owner.address, await token.getAddress(), recipients, amount);
    const receipt = await tx.wait();
    
    // The return value should be true for successful execution
    expect(tx).to.not.be.reverted;
    // This assertion will fail on the mutant which returns false instead of true
    expect(await instance.transfer.staticCall(owner.address, await token.getAddress(), recipients, amount)).to.be.true;
  });
});