import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m447c62cf detection", function () {
  it("should revert when array length is 1 due to out-of-bounds access in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the airdrop contract
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const instance = await AirdropFactory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token (using OpenZeppelin's ERC20)
    const TokenFactory = await ethers.getContractFactory("MyToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve airdrop contract to transfer
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(instance.target, ethers.parseEther("100"));

    // Create array with single recipient
    const recipients = [addr1.address];
    const amount = ethers.parseEther("10");

    // On original: should succeed (i=0 < 1)
    // On mutant: should revert (i<=1 tries i=1, out of bounds)
    await expect(
      instance.transfer(owner.address, token.target, recipients, amount)
    ).to.be.reverted;
  });
});