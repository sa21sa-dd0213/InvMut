import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - mec2b9a46", function () {
  it("should kill mutant by testing transfer from non-allowed sender to non-allowed recipient", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract - need Uniswap router address and USD token address
    // Using a mock router address (this will fail in real deployment but we need the constructor args)
    const mockRouterAddr = "0x0000000000000000000000000000000000000001";
    const mockUSDTokenAddr = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouterAddr, mockUSDTokenAddr);
    await instance.waitForDeployment();
    
    // Transfer some tokens from owner to addr1 first (owner has all tokens initially)
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);
    
    // First transfer enough to addr1 so they have sufficient balance for large transfer
    const largeAmount = ethers.parseEther("15000"); // > minTxnAmount (10000)
    await instance.transfer(addr1.address, largeAmount);
    
    const balanceAddr1BeforeLarge = await instance.balanceOf(addr1.address);
    const balanceAddr2BeforeLarge = await instance.balanceOf(addr2.address);
    
    // Now transfer a large amount that should trigger reward logic
    const largeTestAmount = ethers.parseEther("12000"); // > minTxnAmount
    await instance.connect(addr1).transfer(addr2.address, largeTestAmount);
    
    const balanceAddr1AfterLarge = await instance.balanceOf(addr1.address);
    const balanceAddr2AfterLarge = await instance.balanceOf(addr2.address);
    
    // In the original contract (standard transfer without rewards):
    // - addr1 loses exactly largeTestAmount
    // - addr2 gains exactly largeTestAmount
    
    // In the mutant (_tokenSellTransferReward with reward logic):
    // - If contract has enough balance, reward is given to sender (addr1)
    // - This means addr1 loses less than largeTestAmount (gets some back as reward)
    // - addr2 receives the same amount
    
    // Calculate what should happen in original vs mutant
    const expectedAddr1Loss = largeTestAmount;
    const actualAddr1Loss = balanceAddr1BeforeLarge - balanceAddr1AfterLarge;
    const actualAddr2Gain = balanceAddr2AfterLarge - balanceAddr2BeforeLarge;
    
    // In the original: actualAddr1Loss should equal expectedAddr1Loss (no reward for non-allowed)
    // In the mutant: actualAddr1Loss should be less than expectedAddr1Loss (reward given to sender)
    
    // This assertion should fail on the mutant because the mutant gives rewards to non-allowed senders
    expect(actualAddr1Loss).to.equal(expectedAddr1Loss);
    expect(actualAddr2Gain).to.equal(largeTestAmount);
    
    // Additional check: no reward should have been recorded for addr1 in the original
    const txRewardAddr1 = await instance.txReward(addr1.address);
    expect(txRewardAddr1).to.equal(0);
  });
});