import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant kill test", function () {
  it("should kill mutant mab727b40 by calling transfer with a non-empty array and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to test with
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve airdrop contract to transfer
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(instance.target, ethers.parseEther("100"));

    // Prepare recipient array with one address
    const recipients = [addr1.address];
    const amount = ethers.parseEther("10");

    // This call should succeed on original (require(_tos.length > 0) passes)
    // but fail on mutant (require(_tos.length < 0) always reverts)
    await expect(
      instance.transfer(owner.address, token.target, recipients, amount)
    ).to.not.be.reverted;
  });
});