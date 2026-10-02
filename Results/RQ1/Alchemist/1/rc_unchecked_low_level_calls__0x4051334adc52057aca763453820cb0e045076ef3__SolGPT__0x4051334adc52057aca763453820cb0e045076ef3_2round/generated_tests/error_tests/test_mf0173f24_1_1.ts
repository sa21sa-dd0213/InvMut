import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant test - mf0173f24", function () {
  it("should revert when _tos array is empty on original but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund owner with tokens and approve the airdrop contract
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Attempt to call transfer with empty _tos array
    const emptyAddresses: string[] = [];
    const tx = instance.transfer(
      owner.address,
      await token.getAddress(),
      emptyAddresses,
      ethers.parseEther("10")
    );

    // The original contract would revert due to require(_tos.length > 0)
    // The mutant removes this check, so it should not revert
    await expect(tx).to.not.be.reverted;
  });
});