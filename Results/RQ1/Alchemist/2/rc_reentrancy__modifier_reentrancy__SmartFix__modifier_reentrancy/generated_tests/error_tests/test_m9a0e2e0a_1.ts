import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m9a0e2e0a", function () {
  it("should revert when overflow would occur due to balance being too high", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments needed based on the contract)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Bank contract to satisfy the supportsToken modifier
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // We need the attacker to have a balance that is close to uint256 max
    // First, we need to set the attacker's balance to type(uint256).max - 19
    // This can be done by calling airDrop multiple times or directly setting storage
    // Since there's no setter, we'll simulate by directly manipulating storage
    
    // Get the storage slot for tokenBalance[attacker.address]
    // The mapping slot is 0 (first state variable)
    const slot = ethers.solidityPackedKeccak256(
      ["uint256", "uint256"],
      [attacker.address, 0]
    );
    
    // Set the attacker's balance to max - 19 (just under overflow threshold)
    const maxUint = ethers.MaxUint256;
    const highBalance = maxUint - 19n;
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      ethers.toBeHex(highBalance, 32)
    ]);
    
    // Now the attacker's balance is highBalance (maxUint - 19)
    // Adding 20 would overflow, so the require should catch it
    // Connect as attacker and call airDrop - it should revert on original
    await expect(
      instance.connect(attacker).airDrop()
    ).to.be.reverted;
  });
});