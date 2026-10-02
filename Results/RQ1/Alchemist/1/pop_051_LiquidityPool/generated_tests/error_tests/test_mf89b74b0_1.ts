import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool - mutant mf89b74b0 (withdraw without withApproval)", function () {
  it("should revert when unauthorized address calls withdraw (original has withApproval modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with dummy constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const asset = addr1.address; // placeholder
    const share = addr1.address; // placeholder
    const investmentManager = addr1.address; // placeholder
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(poolId, trancheId, asset, share, investmentManager);
    await instance.waitForDeployment();
    
    // Attempt to call withdraw from addr2 (unauthorized) with owner = addr1
    // Original requires msg.sender == owner (withApproval modifier), so this should revert
    await expect(
      instance.connect(addr2).withdraw(
        ethers.parseEther("100"),
        addr2.address,
        addr1.address
      )
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});