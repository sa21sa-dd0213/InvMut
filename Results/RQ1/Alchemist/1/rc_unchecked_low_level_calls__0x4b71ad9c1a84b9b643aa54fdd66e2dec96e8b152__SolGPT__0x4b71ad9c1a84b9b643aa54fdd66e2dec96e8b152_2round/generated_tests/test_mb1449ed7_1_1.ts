import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - mb1449ed7", function () {
  it("should revert when calling transfer with a single recipient due to out-of-bounds access in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock ERC20 token that will always succeed on transferFrom
    // We need a token contract for the caddress parameter
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Approve the airPort contract to spend tokens on behalf of owner
    const tokenAddress = await token.getAddress();
    const instanceAddress = await instance.getAddress();
    await token.approve(instanceAddress, ethers.parseEther("100"));

    // Prepare a single recipient array
    const recipients = [addr1.address];
    const amount = ethers.parseEther("10");

    // On the original contract this would succeed (i < length, loop runs once)
    // On the mutant (i <= length), loop tries to access index 1 which doesn't exist -> revert
    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, amount)
    ).to.be.reverted;
  });
});