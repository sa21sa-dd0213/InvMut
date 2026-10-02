import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant md5c14dd0 - decreaseDepositRequest access control", function () {
  it("should revert when non-owner calls decreaseDepositRequest", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy LiquidityPool with required constructor arguments
    // Constructor: constructor(uint64 poolId_, bytes16 trancheId_, address asset_, address share_, address investmentManager_)
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1").substring(0, 34) as `0x${string}`;
    const asset = addr1.address; // Using addr1 as placeholder for asset token address
    const share = addr2.address; // Using addr2 as placeholder for share token address
    const investmentManager = owner.address; // Using owner as placeholder for investment manager address
    
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy(
      poolId,
      trancheId,
      asset,
      share,
      investmentManager
    );
    await liquidityPool.waitForDeployment();

    // Try to call decreaseDepositRequest from an unauthorized address (addr1)
    // This should revert with "LiquidityPool/no-approval" on the original contract
    // The mutant removes the withApproval(owner) modifier, so this would not revert on the mutant
    await expect(
      liquidityPool.connect(addr1).decreaseDepositRequest(
        ethers.parseEther("100"),
        owner.address
      )
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});