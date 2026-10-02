import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mb0260178 detection", function () {
  it("should detect mutant by calling rate twice in same block and checking storage not updated", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed as it uses _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault contract that implements IVault interface
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Deploy access control
    const AccessControl = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();

    // Initialize VaultAdapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes
    await accessControl.grantAccess(
      vaultAdapter.interface.getSighash("setSlopes"),
      await vaultAdapter.getAddress(),
      owner.address
    );
    await accessControl.grantAccess(
      vaultAdapter.interface.getSighash("rate"),
      await vaultAdapter.getAddress(),
      owner.address
    );

    // Setup slopes for an asset
    const asset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"),
      slope1: ethers.parseEther("0.5")
    };
    await vaultAdapter.setSlopes(asset, slopes);

    // Set limits
    await vaultAdapter.setLimits(
      ethers.parseEther("2"),   // maxMultiplier
      ethers.parseEther("0.5"), // minMultiplier
      ethers.parseEther("0.1")  // rate
    );

    // First call to rate - this sets lastUpdate to current block.timestamp
    const mockVaultAddress = await mockVault.getAddress();
    await vaultAdapter.rate(mockVaultAddress, asset);

    // Get the storage slot for utilizationData[mockVault][asset]
    // Storage slot calculation: keccak256(abi.encode(asset, keccak256(abi.encode(mockVault, slot))))
    const storageSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32"],
        [
          asset,
          ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
              ["address", "uint256"],
              [mockVaultAddress, 1] // slot 1 for mapping utilizationData
            )
          )
        ]
      )
    );

    // Read lastUpdate before second call
    const lastUpdateSlot = ethers.toBigInt(storageSlot) + 2n; // lastUpdate is the third field (index 2)
    const lastUpdateBefore = await ethers.provider.getStorage(
      await vaultAdapter.getAddress(),
      ethers.toBeHex(lastUpdateSlot)
    );

    // Mine a block with same timestamp (simulate same block)
    const blockBefore = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [blockBefore!.timestamp]);
    await ethers.provider.send("evm_mine", []);

    // Second call in same block (block.timestamp == lastUpdate)
    await vaultAdapter.rate(mockVaultAddress, asset);

    // Read lastUpdate after second call
    const lastUpdateAfter = await ethers.provider.getStorage(
      await vaultAdapter.getAddress(),
      ethers.toBeHex(lastUpdateSlot)
    );

    // In the original contract, lastUpdate should NOT be updated (stays same)
    // In the mutant (>=), lastUpdate WOULD be updated
    // This test passes on original, fails on mutant
    expect(lastUpdateBefore).to.equal(lastUpdateAfter);
  });
});