import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m39231ab2 - empty _tos array test", function () {
  it("should revert when _tos array is empty", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the airdrop contract (no constructor arguments needed)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Deploy a simple ERC20 token to use as the token address (caddress)
    // Using a minimal ERC20 that supports transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airdrop contract to spend them
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.connect(owner).approve(await airdrop.getAddress(), ethers.parseEther("1000"));

    // Attempt to call transfer with an empty _tos array
    // The original contract requires _tos.length > 0, so this should revert
    await expect(
      airdrop.connect(owner).transfer(
        owner.address,
        await token.getAddress(),
        [], // Empty _tos array
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});