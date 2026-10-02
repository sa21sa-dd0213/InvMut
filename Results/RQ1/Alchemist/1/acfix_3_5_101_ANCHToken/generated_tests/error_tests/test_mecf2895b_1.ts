import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant mecf2895b - _getCurrentSupply operator change", function () {
  it("should detect mutant by performing a transfer when rSupply exactly equals _rTotal.div(_tTotal)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with Uniswap router and USDC token addresses
    // For testing, we use a mock router address since we're testing internal logic
    const USDC_ADDRESS = "0x0000000000000000000000000000000000000001";
    const ROUTER_ADDRESS = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(ROUTER_ADDRESS, USDC_ADDRESS);
    await instance.waitForDeployment();

    // Get initial supply values
    const totalSupply = await instance.totalSupply();
    const initialBalance = await instance.balanceOf(owner.address);
    
    // Perform a small transfer to slightly reduce rSupply while maintaining equality condition
    // The key is that after transfers, rSupply decreases proportionally to maintain rSupply = _rTotal.div(_tTotal)
    // when the actual ratio is exactly 1
    
    // First, transfer a very small amount to create state where rSupply exactly equals _rTotal.div(_tTotal)
    const smallAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    
    // Transfer from owner to addr1 to trigger state changes
    await instance.connect(owner).transfer(addr1.address, smallAmount);
    
    // Now transfer back to create the exact condition where rSupply == _rTotal.div(_tTotal)
    await instance.connect(addr1).transfer(owner.address, smallAmount);
    
    // Get current state
    const rTotal = await instance.totalSupply(); // This is _tTotal
    const rSupply = await instance.balanceOf(owner.address); // This gives us reflection balance
    
    // The mutant would return initial values when rSupply <= _rTotal.div(_tTotal)
    // Original returns actual values when rSupply == _rTotal.div(_tTotal)
    // This difference affects rate calculation in subsequent transfers
    
    // Perform a transfer that should be affected by the different rate calculation
    const testAmount = ethers.parseEther("1000");
    
    // Get balance before
    const balanceBefore = await instance.balanceOf(addr2.address);
    
    // Execute transfer
    await instance.connect(owner).transfer(addr2.address, testAmount);
    
    // Get balance after
    const balanceAfter = await instance.balanceOf(addr2.address);
    
    // In the original, the rate would be calculated correctly
    // In the mutant, the rate would be different, leading to different token amounts
    // The mutant would show a different balance than expected
    
    // Assert that the balance change matches expected behavior
    // For the original, the transfer amount should be exact
    // For the mutant, it would be different due to incorrect rate calculation
    const actualTransfer = balanceAfter - balanceBefore;
    expect(actualTransfer).to.equal(testAmount);
    
    // Additional check: verify that subsequent transfers behave consistently
    const finalBalance = await instance.balanceOf(addr2.address);
    await instance.connect(owner).transfer(addr2.address, testAmount);
    const finalBalanceAfter = await instance.balanceOf(addr2.address);
    
    // The mutant would show inconsistent transfer amounts due to wrong rate
    const secondTransfer = finalBalanceAfter - finalBalance;
    expect(secondTransfer).to.equal(testAmount);
    
    // If both transfers show exact amounts, the original is working correctly
    // If the amounts differ, the mutant is detected
  });
});