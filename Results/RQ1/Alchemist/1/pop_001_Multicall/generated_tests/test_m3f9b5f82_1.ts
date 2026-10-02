import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant detection - m3f9b5f82", function () {
  it("should revert when calling multicall with an empty array due to out-of-bounds access", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Multicall - note: this contract doesn't have a constructor,
    // it's a library, so we need to deploy it differently
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const multicall = await MulticallFactory.deploy();
    await multicall.waitForDeployment();

    // The mutant changes i < data.length to i <= data.length
    // With an empty array (data.length = 0), the original skips the loop
    // The mutant will try to access data[0] which is out of bounds and reverts
    
    // Prepare empty bytes array
    const emptyData: string[] = [];
    
    // Call multicall with empty array - should revert due to out-of-bounds access
    await expect(
      multicall.multicall(emptyData)
    ).to.be.reverted;
  });
});