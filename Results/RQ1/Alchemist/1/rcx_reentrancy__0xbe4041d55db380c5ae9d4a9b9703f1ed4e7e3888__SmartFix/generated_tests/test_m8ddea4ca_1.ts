import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection test", function () {
  it("should detect mutant m8ddea4ca by causing revert when balance + msg.value equals max uint256", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set MinSum to 0 so balance checks don't interfere
    await instance.SetMinSum(0);
    
    // Calculate max uint256 value
    const maxUint256 = ethers.MaxUint256;
    
    // We need to make the contract's balance such that current balance + msg.value == maxUint256
    // Send exactly maxUint256 - 1 wei to the contract via Put, so balance becomes maxUint256 - 1
    const firstDeposit = maxUint256 - 1n;
    await instance.connect(addr1).Put(0, { value: firstDeposit });
    
    // Now send 1 wei - this should succeed in original but revert in mutant
    // because the mutant's require adds 1 to msg.value, making left side overflow
    await expect(
      instance.connect(addr1).Put(0, { value: 1n })
    ).to.be.reverted;
  });
});