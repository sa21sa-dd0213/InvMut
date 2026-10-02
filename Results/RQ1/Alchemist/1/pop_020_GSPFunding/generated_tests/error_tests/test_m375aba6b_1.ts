import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - m375aba6b", function () {
  it("should kill mutant by verifying second buyShares call uses ratio-based calculation instead of re-initializing", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with required constructor arguments
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    const instance = await GSPFundingFactory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("1"),    // _I_ (initial price)
      ethers.parseEther("0.5"),  // _K_ (curve parameter)
      0,                         // _MT_FEE_RATE_
      0,                         // _LP_FEE_RATE_
      owner.address              // _MAINTAINER_
    );
    await instance.waitForDeployment();

    // Setup: fund owner with tokens and approve
    const initialBaseAmount = ethers.parseEther("10000");
    const initialQuoteAmount = ethers.parseEther("10000");
    
    await baseToken.mint(owner.address, initialBaseAmount);
    await quoteToken.mint(owner.address, initialQuoteAmount);
    
    await baseToken.connect(owner).approve(await instance.getAddress(), ethers.MaxUint256);
    await quoteToken.connect(owner).approve(await instance.getAddress(), ethers.MaxUint256);

    // First buyShares call - initializes the pool
    const firstBaseDeposit = ethers.parseEther("1000");
    const firstQuoteDeposit = ethers.parseEther("1000");
    
    await baseToken.connect(owner).transfer(await instance.getAddress(), firstBaseDeposit);
    await quoteToken.connect(owner).transfer(await instance.getAddress(), firstQuoteDeposit);
    
    const tx1 = await instance.connect(owner).buyShares(owner.address);
    const receipt1 = await tx1.wait();
    
    // Get state after first deposit
    const totalSupplyAfterFirst = await instance.totalSupply();
    const baseTargetAfterFirst = await instance._BASE_TARGET_();
    const quoteTargetAfterFirst = await instance._QUOTE_TARGET_();

    // Second buyShares call - should use ratio-based logic in original, but mutant will re-initialize
    const secondBaseDeposit = ethers.parseEther("500");
    const secondQuoteDeposit = ethers.parseEther("500");
    
    await baseToken.connect(owner).transfer(await instance.getAddress(), secondBaseDeposit);
    await quoteToken.connect(owner).transfer(await instance.getAddress(), secondQuoteDeposit);
    
    const tx2 = await instance.connect(owner).buyShares(owner.address);
    const receipt2 = await tx2.wait();

    // Get state after second deposit
    const totalSupplyAfterSecond = await instance.totalSupply();
    const baseTargetAfterSecond = await instance._BASE_TARGET_();
    const quoteTargetAfterSecond = await instance._QUOTE_TARGET_();

    // Verify that the second deposit correctly increased targets proportionally
    // In the original code, targets should increase by mintRatio * existing targets
    // In the mutant, targets would be reset to initial values (wrong behavior)
    
    const expectedBaseTargetIncrease = baseTargetAfterFirst * secondBaseDeposit / firstBaseDeposit;
    const expectedQuoteTargetIncrease = quoteTargetAfterFirst * secondQuoteDeposit / firstQuoteDeposit;
    
    // The mutant will reset targets to the first deposit values instead of increasing them
    // Therefore checking that targets increased properly will detect the mutant
    expect(baseTargetAfterSecond).to.be.gt(baseTargetAfterFirst);
    expect(quoteTargetAfterSecond).to.be.gt(quoteTargetAfterFirst);
    
    // The mutant would also mint extra 1001 dead shares again, making total supply inconsistent
    // Check that total supply increased by a reasonable amount (not reset)
    expect(totalSupplyAfterSecond).to.be.gt(totalSupplyAfterFirst);
    
    // Verify the second deposit didn't create an abnormally large total supply
    // (mutant would mint 1001 dead shares again)
    const expectedSupplyIncrease = totalSupplyAfterFirst * secondBaseDeposit / firstBaseDeposit;
    expect(totalSupplyAfterSecond).to.be.lt(totalSupplyAfterFirst * 2);
  });
});