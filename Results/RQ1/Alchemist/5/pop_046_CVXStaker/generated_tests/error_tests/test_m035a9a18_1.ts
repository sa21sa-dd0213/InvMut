import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker mutant m035a9a18 - setOperator replaces _operator with address(0)", function () {
  it("should revert when calling depositAndStake from the newly set operator after setOperator with non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with dummy constructor arguments
    // CVXStaker requires: address _operator, IERC20 _clpToken, ICVXBooster _booster, address[] memory _rewardTokens
    // We'll use addr1 as operator initially, and deploy with zero addresses for other contracts since we only need to test the modifier
    const Factory = await ethers.getContractFactory("CVXStaker");
    const clpToken = ethers.ZeroAddress; // dummy zero address for CLP token
    const booster = ethers.ZeroAddress; // dummy zero address for booster
    const rewardTokens: string[] = []; // empty array
    
    const instance = await Factory.deploy(addr1.address, clpToken, booster, rewardTokens);
    await instance.waitForDeployment();
    
    // Now call setOperator from owner with a non-zero address (addr1)
    await instance.connect(owner).setOperator(addr1.address);
    
    // After the mutation, operator should be address(0) instead of addr1.address
    // So calling depositAndStake from addr1 (which should be operator) should revert
    await expect(
      instance.connect(addr1).depositAndStake(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});