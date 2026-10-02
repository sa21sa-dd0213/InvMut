import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m3003b541 (remove event emission)", function () {
  it("should emit UpdatedRewardDistributor event when setRewardDistributor is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for stakingToken
    const ERC20Factory = await ethers.getContractFactory("IERC20");
    // We need to deploy an actual ERC20 token for the constructor
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Test that the event is emitted when changing the reward distributor
    await expect(instance.connect(owner).setRewardDistributor(addr1.address))
      .to.emit(instance, "UpdatedRewardDistributor")
      .withArgs(addr1.address);
  });
});