import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant detection - keccak256 vs sha256", function () {
  it("should detect mutant that replaces keccak256 with sha256 by verifying correct function selector is used", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that has transferFrom function
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the demo contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(await instance.getAddress(), mintAmount);

    // Fund addr1 with some tokens to receive
    const transferAmount = ethers.parseEther("10");
    const recipients = [addr1.address];

    // This should work on original (keccak256) but fail on mutant (sha256)
    // because sha256 produces different function selector bytes
    const tx = instance.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );

    // If mutant is deployed, the inner call will use wrong selector and revert
    await expect(tx).to.not.be.reverted;

    // Verify the transfer actually happened (will fail on mutant since tx reverts)
    const balanceAfter = await token.balanceOf(addr1.address);
    expect(balanceAfter).to.equal(transferAmount);
  });
});