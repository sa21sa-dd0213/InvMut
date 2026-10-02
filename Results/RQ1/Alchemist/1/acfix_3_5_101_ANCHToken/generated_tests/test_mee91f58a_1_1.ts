import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - allowance override", function () {
  it("should fail to compile if override keyword is missing from allowance function", async function () {
    const [owner] = await ethers.getSigners();

    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";

    try {
      const Factory = await ethers.getContractFactory("ANCHToken");
      const instance = await Factory.deploy(mockRouter, mockUSDToken);
      await instance.waitForDeployment();

      const contractAsIERC20 = await ethers.getContractAt("IERC20", await instance.getAddress());
      
      await contractAsIERC20.allowance(owner.address, owner.address);
      
      expect.fail("Contract should not compile without override keyword");
    } catch (error: any) {
      expect(error.message).to.include("override");
    }
  });
});