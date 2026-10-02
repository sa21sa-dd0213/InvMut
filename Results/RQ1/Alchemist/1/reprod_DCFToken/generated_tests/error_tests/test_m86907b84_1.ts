import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-cfo calls setLiquidityReceiveAddress (mutant removes onlyCaller modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr2.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Set the cfo to owner
    await instance.setCaller(owner.address);
    
    // Attempt to call setLiquidityReceiveAddress from addr1 (not the cfo)
    // In the original contract, this should revert due to onlyCaller modifier
    // In the mutant, the modifier is removed, so it would succeed (killing the mutant)
    await expect(
      instance.connect(addr1).setLiquidityReceiveAddress(addr1.address)
    ).to.be.reverted;
  });
});