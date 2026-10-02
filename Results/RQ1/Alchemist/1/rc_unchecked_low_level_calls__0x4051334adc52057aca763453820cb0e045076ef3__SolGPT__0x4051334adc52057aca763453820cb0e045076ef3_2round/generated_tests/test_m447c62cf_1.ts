import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airdrop mutant test - off-by-one in loop", function () {
  it("should detect the mutant where i < _tos.length is changed to i <= _tos.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that implements transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airdrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);

    // Prepare recipients array with exactly one address
    const recipients = [addr1.address];
    const transferAmount = ethers.parseEther("10");

    // On the original contract, this call should succeed (one transfer)
    // On the mutant, the loop will attempt i <= _tos.length (i=0, i=1) causing an out-of-bounds access
    await expect(
      instance.connect(owner).transfer(
        owner.address,
        await token.getAddress(),
        recipients,
        transferAmount
      )
    ).to.be.reverted;
  });
});