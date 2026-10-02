import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m4cc3d57f where loop condition i<_tos.length is changed to i>_tos.length", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: single recipient with a value
    const tos = [recipient.address];
    const values = [100];

    // Capture the state before the call - we expect the loop to execute in original
    // In mutant, the loop condition i > _tos.length (0 > 1) is false, so no calls happen
    
    // Call transfer - this should trigger transferFrom calls in original
    const tx = await instance.connect(owner).transfer(
      from.address,
      ethers.ZeroAddress, // caddress is irrelevant for the loop execution test
      tos,
      values
    );
    await tx.wait();

    // The test passes if the call succeeds (original behavior)
    // To kill the mutant, we verify the loop actually executed by checking
    // that the transaction emitted at least one CALL opcode (simplified: we check it doesn't revert)
    // More precisely: if the loop ran, it attempted to call caddress (ZeroAddress) which would succeed silently
    // If the loop didn't run (mutant), no external calls were made but tx still returns true
    // So we verify the transaction completed without revert - this is expected for both
    // However, the key difference is that the original makes external calls while mutant doesn't
    
    // To actually detect the mutant, we need to check that the transferFrom calls were attempted
    // Since caddress is ZeroAddress, calls will fail silently but the loop still iterates
    // We can detect this by checking that the transaction used gas - mutant loop never runs, so gas used is lower
    
    const receipt = await tx.getReceipt();
    const gasUsed = receipt.gasUsed;
    
    // Gas for original with one iteration: base tx + loop overhead + call attempt
    // Gas for mutant: base tx + require check + loop condition check (fails immediately)
    // Mutant uses significantly less gas because the loop body never executes
    const originalMinGas = 30000n; // Conservative estimate for loop execution with one iteration
    expect(gasUsed).to.be.gt(originalMinGas, "Mutant detected: loop did not execute, gas usage too low");
  });
});