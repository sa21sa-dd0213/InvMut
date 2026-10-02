import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant mab727b40 test", function () {
  it("should succeed with one valid recipient and kill mutant that uses require(_tos.length < 0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20 token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve airdrop contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(instance.target, ethers.parseEther("100"));

    // The airdrop contract's transfer function expects (from, tokenAddress, recipients, amount)
    const recipients = [addr1.address];
    const amount = ethers.parseEther("1");

    // This should succeed on original (length > 0) but fail on mutant (length < 0 always false)
    await expect(
      instance.transfer(owner.address, token.target, recipients, amount)
    ).to.not.be.reverted;
  });
});