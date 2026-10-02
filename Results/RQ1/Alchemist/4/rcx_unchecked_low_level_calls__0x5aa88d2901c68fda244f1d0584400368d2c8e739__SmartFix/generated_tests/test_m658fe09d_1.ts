import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection - Command access control", function () {
  it("should revert when non-owner calls Command (kills mutant that removes require)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare a call that the attacker will attempt - call Command with empty data and 0 value
    const emptyData = "0x";
    
    // Attempt to call Command from an unauthorized address (attacker)
    // Original contract should revert because attacker != Owner
    // Mutant (which removes the require) would not revert, so this test kills the mutant
    await expect(
      instance.connect(attacker).Command(attacker.address, emptyData, { value: 0 })
    ).to.be.reverted;
  });
});