import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant mfe569333 test", function () {
  it("should kill mutant by calling withdrawGovernanceAsset with amount = 0", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with a mock DAO address (needed for constructor)
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(owner.address);
    await instance.waitForDeployment();

    // Deploy a mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to addr1 and approve the contract
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Set flashGovernanceConfig via storage manipulation
    // Storage slot 0: flashGovernanceConfig.amount (uint256)
    // Storage slot 1: flashGovernanceConfig.unlockTime (uint256)
    // Storage slot 2: flashGovernanceConfig.asset (address)
    // Storage slot 3: flashGovernanceConfig.assetBurnable (bool)

    // Set flashGovernanceConfig.asset to token address (slot 2)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + ethers.toBeHex(2, 32),
      ethers.zeroPadValue(token.address, 32)
    ]);

    // Set flashGovernanceConfig.amount to some value (slot 0)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + ethers.toBeHex(0, 32),
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1")), 32)
    ]);

    // Set flashGovernanceConfig.unlockTime to past time (slot 1)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + ethers.toBeHex(1, 32),
      ethers.zeroPadValue(ethers.toBeHex(1), 32) // timestamp 1, definitely in past
    ]);

    // Compute storage slot for pendingFlashDecision mapping (slot 9)
    const targetAddress = owner.address;
    const senderAddress = addr1.address;
    const baseSlot = ethers.toBeHex(9, 32);

    // keccak256(abi.encode(target, baseSlot))
    const innerHash = ethers.keccak256(
      ethers.concat([
        ethers.zeroPadValue(targetAddress, 32),
        baseSlot
      ])
    );

    // keccak256(abi.encode(sender, innerHash))
    const pendingSlot = ethers.keccak256(
      ethers.concat([
        ethers.zeroPadValue(senderAddress, 32),
        innerHash
      ])
    );

    // Set pendingFlashDecision asset to token address (slot pendingSlot + 2)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      ethers.toBeHex(BigInt(pendingSlot) + 2n, 32),
      ethers.zeroPadValue(token.address, 32)
    ]);

    // Set pendingFlashDecision amount to 0 (slot pendingSlot + 0)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      ethers.toBeHex(BigInt(pendingSlot) + 0n, 32),
      ethers.zeroPadValue("0x0", 32)
    ]);

    // Set pendingFlashDecision unlockTime to past (slot pendingSlot + 1)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      ethers.toBeHex(BigInt(pendingSlot) + 1n, 32),
      ethers.zeroPadValue(ethers.toBeHex(1), 32)
    ]);

    // Now call withdrawGovernanceAsset with targetContract = owner, asset = token
    // Original should revert because amount > 0 is false (AND condition fails)
    // Mutant should succeed because asset matches (OR condition passes)
    await expect(
      instance.connect(addr1).withdrawGovernanceAsset(owner.address, token.address)
    ).to.be.revertedWith("Limbo: Flashgovernance decision pending.");
  });
});