import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mf7503b62 test - kill the mutant", function () {
  it("should burn deadAmount from pair when pair balance is greater than deadAmount after sell", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the DCF contract with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address);
    await instance.waitForDeployment();
    const dcfAddress = await instance.getAddress();

    // Get router address from contract
    const routerAddress = await instance.router();
    const USDTAddress = await instance.USDT();
    
    // Create mock USDT and router for testing - but since we're using real addresses from BSC,
    // we need to simulate the environment. For testing purposes, we'll deploy mock contracts.
    
    // Deploy mock USDT token
    const MockERC20Factory = await ethers.getContractFactory("ERC20");
    const mockUSDT = await MockERC20Factory.deploy("Mock USDT", "USDT");
    await mockUSDT.waitForDeployment();
    
    // Deploy mock router that can handle the calls
    // Actually, we need to use the contract's actual addresses. Let's deploy a minimal mock pair
    
    // Get the pair address from the contract
    const pairAddress = await instance.pairAddress();
    
    // Mint tokens to owner for testing
    const initialSupply = ethers.parseEther("2000000");
    
    // Transfer some tokens to addr1 to simulate a seller
    await instance.transfer(addr1.address, ethers.parseEther("100000"));
    
    // Get initial pair balance
    const initialPairBalance = await instance.balanceOf(pairAddress);
    
    // Calculate deadAmount (based on deadCfg = 2, fee = 5%)
    const sellAmount = ethers.parseEther("1000");
    const fee = (sellAmount * 5n) / 100n;
    const amountAfterFee = sellAmount - fee;
    const deadAmount = amountAfterFee / 2n; // deadCfg = 2
    
    // Simulate a sell to the pair from addr1
    // First, approve the contract to spend tokens (though _transfer doesn't need approval)
    // We need to call transfer directly to the pair address to trigger the sell logic
    await instance.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Check the pair balance after the transaction
    const finalPairBalance = await instance.balanceOf(pairAddress);
    
    // In the original code, if balanceOf(pairAddress) > deadAmount, it should burn deadAmount
    // The burn reduces the pair's balance by deadAmount
    // The pair balance should have decreased by deadAmount compared to what it would be without burn
    
    // Without burn: initialPairBalance + amountAfterFee (since fee goes to contract)
    // With burn: initialPairBalance + amountAfterFee - deadAmount
    const expectedBalanceWithoutBurn = initialPairBalance + amountAfterFee;
    const expectedBalanceWithBurn = expectedBalanceWithoutBurn - deadAmount;
    
    // The original should have burned, so final balance should be expectedBalanceWithBurn
    // The mutant with < would NOT burn (since pair balance is likely > deadAmount),
    // so final balance would be expectedBalanceWithoutBurn
    
    expect(finalPairBalance).to.equal(expectedBalanceWithBurn);
  });
});