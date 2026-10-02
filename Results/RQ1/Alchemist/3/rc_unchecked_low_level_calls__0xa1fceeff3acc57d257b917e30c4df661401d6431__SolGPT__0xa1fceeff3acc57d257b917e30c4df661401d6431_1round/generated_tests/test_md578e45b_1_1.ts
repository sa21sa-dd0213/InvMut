import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection - sha256 vs keccak256", function () {
  it("should fail on mutant because sha256 produces wrong function selector for transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund owner with tokens and approve the AirDropContract to transferFrom owner
    await token.transfer(owner.address, ethers.parseEther("100"));
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airdrop = await AirDropFactory.deploy();
    await airdrop.waitForDeployment();

    const approveAmount = ethers.parseEther("10");
    await token.approve(await airdrop.getAddress(), approveAmount);

    // Prepare transfer parameters
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("5"), ethers.parseEther("5")];

    // This should revert on the mutant because sha256 produces wrong selector
    await expect(
      airdrop.transfer(await token.getAddress(), recipients, amounts)
    ).to.be.reverted;
  });
});