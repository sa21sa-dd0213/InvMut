import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m41fe0e10 test", function () {
  it("should revert when alloSettings is not set (zero address) before calling create", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments as it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up a round implementation
    await instance.connect(owner).updateRoundImplementation(addr1.address);
    
    // We need to make the owner a program operator to bypass that check
    // Since the contract doesn't have a function to add program operators,
    // we need to set it directly using storage manipulation or by setting the mapping
    // For testing purposes, we'll set the programOperators mapping directly
    // This is done by setting the storage slot for the mapping
    // The mapping is at slot 0 for the RoundFactory contract (after OwnableUpgradeable's gaps)
    // We need to calculate the storage slot for programOperators[owner]
    
    // Storage layout: OwnableUpgradeable has __gap_2 which is 49 uint256 slots
    // programOperators mapping is declared after OwnableUpgradeable
    // The mapping slot is the next slot after the parent contract's storage
    // Parent contract uses slots 0-49 (50 slots: _owner at slot 0, __gap_2 at slots 1-49)
    // So programOperators is at slot 50
    
    const programOperatorSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [owner.address, 50] // 50 is the storage slot for the mapping
      )
    );
    
    // Set the programOperators mapping to true for the owner
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      programOperatorSlot,
      ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true])
    ]);
    
    // Verify the owner is now a program operator
    expect(await instance.programOperators(owner.address)).to.be.true;
    
    // Now try to call create without setting alloSettings (it's still address(0))
    // This should revert with "alloSettings is 0x" in the original contract
    // The mutant removes this check, so this test verifies the mutant behavior
    await expect(
      instance.connect(owner).create(
        ethers.toUtf8Bytes("test"),
        addr2.address
      )
    ).to.be.revertedWith("alloSettings is 0x");
  });
});