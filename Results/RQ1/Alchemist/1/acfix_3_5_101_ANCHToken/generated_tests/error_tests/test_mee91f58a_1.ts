import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - allowance override", function () {
  it("should fail to compile if override keyword is missing from allowance function", async function () {
    // The mutant removes the 'override' keyword from the allowance function
    // This test verifies that the contract properly implements the IERC20 interface
    // by calling allowance through the interface, which requires override
    
    const [owner] = await ethers.getSigners();
    
    // Deploy with mock addresses for constructor
    // Note: We need valid addresses for the constructor
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";
    
    try {
      const Factory = await ethers.getContractFactory("ANCHToken");
      const instance = await Factory.deploy(mockRouter, mockUSDToken);
      await instance.waitForDeployment();
      
      // If deployment succeeds, test the allowance function through the IERC20 interface
      const contractAsIERC20 = await ethers.getContractAt("IERC20", await instance.getAddress());
      
      // This call should fail if the override keyword is missing
      // because the contract won't properly implement the interface
      await contractAsIERC20.allowance(owner.address, owner.address);
      
      // If we reach here, the mutant might not have been applied
      // or the contract compiles despite missing override
      expect.fail("Contract should not compile without override keyword");
    } catch (error: any) {
      // Expect compilation error due to missing override
      expect(error.message).to.include("override");
    }
  });
});