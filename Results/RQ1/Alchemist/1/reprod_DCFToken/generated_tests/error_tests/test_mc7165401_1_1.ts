import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mc7165401 - division vs subtraction in deadAmount", function () {
  it("should detect mutant by verifying correct deadAmount calculation on sell", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    const dcfAddress = await instance.getAddress();

    // Set CFO to allow configuring parameters
    await instance.setCaller(owner.address);
    
    // Add owner to white list to enable initial transfers
    await instance.setWhite(owner.address, true);
    
    // Transfer some tokens to addr1 for testing
    await instance.transfer(addr1.address, ethers.parseEther("1000"));
    await instance.setWhite(addr1.address, true);

    // Get the pair address
    const pairAddress = await instance.pairAddress();
    
    // Get initial balance of pair address
    const initialPairBalance = await instance.balanceOf(pairAddress);
    
    // Perform a transfer that simulates a sell (to pair address)
    const sellAmount = ethers.parseEther("1000");
    
    // Execute the transfer to pair address (simulating a sell)
    await instance.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Get the final balance of pair address
    const finalPairBalance = await instance.balanceOf(pairAddress);
    
    // Calculate expected deadAmount using original formula: (amount - fee) / deadCfg
    // fee = (sellAmount * 5) / 100 = 50 tokens
    // amount after fee = 1000 - 50 = 950
    // deadCfg = 2
    // deadAmount = 950 / 2 = 475
    
    // With the mutant formula: (amount - fee) - deadCfg = 950 - 2 = 948
    
    // The pair balance after the transfer should be different between original and mutant
    // Original: pair receives (amount - fee) = 950 tokens, then burns deadAmount = 475
    // Final pair balance should be 950 - 475 = 475
    
    // With mutant: pair receives 950, burns 948, final = 2
    
    // So we can assert that the final pair balance matches the original calculation
    // If mutant is present, this assertion will fail
    const fee = (sellAmount * 5n) / 100n;
    const amountAfterFee = sellAmount - fee;
    const expectedDeadAmount = amountAfterFee / 2n;
    const expectedFinalBalance = amountAfterFee - expectedDeadAmount;
    
    expect(finalPairBalance).to.equal(expectedFinalBalance);
    
    // Also verify the total supply decreased by the deadAmount
    const totalSupply = await instance.totalSupply();
    const expectedSupply = ethers.parseEther("2000000") - expectedDeadAmount;
    expect(totalSupply).to.equal(expectedSupply);
  });
});