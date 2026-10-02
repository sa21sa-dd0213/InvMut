import { expect } from "chai";
import { ethers } } from "hardhat";

describe("LiquidityPool mutant meea725f1 - redeem access control", function () {
  it("should revert when unauthorized address calls redeem on behalf of owner (mutant kills modifier)", async function () {
    const [owner, attacker, receiver] = await ethers.getSigners();
    
    // Deploy LiquidityPool with required constructor arguments
    // Note: These constructor arguments are placeholders - replace with actual deployed addresses
    const poolId = 1;
    const trancheId = "0x00000000000000000000000000000001";
    const asset = "0x0000000000000000000000000000000000000001"; // Replace with actual asset token address
    const share = "0x0000000000000000000000000000000000000002"; // Replace with actual share token address
    const investmentManager = "0x0000000000000000000000000000000000000003"; // Replace with actual investment manager address
    
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPool.deploy(poolId, trancheId, asset, share, investmentManager);
    await pool.waitForDeployment();
    
    // Attempt to call redeem with attacker as msg.sender and owner as a different address
    // The original contract would revert with "LiquidityPool/no-approval"
    // The mutant would allow this call to proceed (failing the test)
    const shares = ethers.parseEther("100");
    await expect(
      pool.connect(attacker).redeem(shares, receiver.address, owner.address)
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});