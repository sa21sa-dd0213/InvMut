import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty in transfer function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Call transfer with empty _tos array - should revert due to require(_tos.length > 0)
    await expect(
      instance.transfer([], [])
    ).to.be.reverted;
  });
});