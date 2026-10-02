import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mface6bfa test", function () {
  it("should kill mutant by passing nonzero v[i] value that passes original but fails mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Test with v[i] = 1 (nonzero) which should pass original overflow check
    // but fail mutant's incorrect addition check
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];
    
    // The call should revert on the mutant because (1e18 + 1) != 1e18
    await expect(
      instance.transfer(tos, values)
    ).to.be.reverted;
  });
});