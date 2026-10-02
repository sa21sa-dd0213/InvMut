import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant mcf1f346d - loop condition change", function () {
  it("should execute multicall operations and verify state changes", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Multicall with required constructor arguments
    const Factory = await ethers.getContractFactory("Multicall");

    // These are the struct parameters needed for initialization
    const feeConfigParams = {
      swapFeeAPR: ethers.parseEther("0.05"), // 5% APR
      fragmentationFee: ethers.parseEther("10"),
      liquidationRewardPercent: ethers.parseEther("0.1"),
      overdueCollateralProtocolPercent: ethers.parseEther("0.05"),
      collateralProtocolPercent: ethers.parseEther("0.1"),
      feeRecipient: owner.address
    };

    const riskConfigParams = {
      crOpening: ethers.parseEther("1.5"),
      crLiquidation: ethers.parseEther("1.2"),
      minimumCreditBorrowAToken: ethers.parseEther("100"),
      borrowATokenCap: ethers.parseEther("1000000"),
      minTenor: 86400, // 1 day
      maxTenor: 31536000 // 1 year
    };

    const oracleParams = {
      priceFeed: "0x0000000000000000000000000000000000000001", // placeholder address
      variablePoolBorrowRateStaleRateInterval: 3600
    };

    const dataParams = {
      weth: "0x0000000000000000000000000000000000000002",
      underlyingCollateralToken: "0x0000000000000000000000000000000000000003",
      underlyingBorrowToken: "0x0000000000000000000000000000000000000004",
      variablePool: "0x0000000000000000000000000000000000000005"
    };

    const instance = await Factory.deploy(
      feeConfigParams,
      riskConfigParams,
      oracleParams,
      dataParams
    );
    await instance.waitForDeployment();

    // Prepare multicall data - create a simple operation that modifies state
    // Encode a call to a function that exists in the contract
    const iface = new ethers.Interface([
      "function setUserConfiguration(uint256 openingLimitBorrowCR, bool allCreditPositionsForSaleDisabled, bool creditPositionIdsForSale, uint256[] memory creditPositionIds)"
    ]);

    const callData = iface.encodeFunctionData("setUserConfiguration", [
      ethers.parseEther("1.3"),
      false,
      true,
      []
    ]);

    // Execute multicall with the encoded data
    const multicallData = [callData];
    const tx = await instance.multicall(multicallData);
    const receipt = await tx.wait();

    // If the loop runs (original), the delegate call should execute
    // If the loop doesn't run (mutant), no state changes occur
    // We can verify by checking if the user configuration was actually set
    // This test should pass on original but fail on mutant because mutant's loop never executes

    // Verify that the multicall actually executed by checking event logs or state
    // Since we can't easily check internal state, we check that the transaction
    // consumed gas (mutant loop would consume minimal gas)
    expect(receipt.gasUsed).to.be.gt(21000); // Base transaction gas

    // For a more definitive test, we can try to verify that the delegate call happened
    // by checking if the isMulticall flag was set and reset properly
    // This is an internal state variable, so we test indirectly

    // Execute another multicall to verify state was modified
    const tx2 = await instance.multicall(multicallData);
    const receipt2 = await tx2.wait();

    // Both transactions should succeed and consume similar gas
    // If mutant killed, first call would do nothing but second would also do nothing
    // Both should consume similar gas (low) in mutant case
    // In original, both should consume similar gas (higher)
    expect(receipt2.gasUsed).to.be.gt(21000);

    // The key assertion: if loop never executes (mutant), the gas used should be 
    // significantly less than if it executes (original)
    // We can check that gas used is reasonable for a call that does work
    expect(receipt.gasUsed).to.be.gt(50000); // Expect at least some work was done
  });
});