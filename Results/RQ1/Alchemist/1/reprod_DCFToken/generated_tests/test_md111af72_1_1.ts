import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant md111af72 - router address change", function () {
  it("should revert when trying to swap tokens using the mutated router address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a valid liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Get the router address from the deployed contract
    const routerAddress = await instance.router();
    
    // Verify the router address is the mutated one (DCT token address)
    // The original should be 0x10ED43C718714eb63d5aA57B78B54704E256024E
    // The mutant changes it to 0x56f46bD073E9978Eb6984C0c3e5c661407c3A447
    const expectedMutatedAddress = "0x56f46bD073E9978Eb6984C0c3e5c661407c3A447";
    expect(routerAddress.toLowerCase()).to.equal(expectedMutatedAddress.toLowerCase());
    
    // Get the pair address
    const pairAddress = await instance.pairAddress();
    
    // First, transfer some tokens to owner to setup the test
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(owner.address, transferAmount);
    
    // Now transfer tokens to the pair address to trigger the swap logic
    // This should fail because the router address points to DCT token contract
    // which doesn't implement swapExactTokensForTokensSupportingFeeOnTransferTokens
    await expect(
      instance.connect(owner).transfer(pairAddress, ethers.parseEther("100"))
    ).to.be.reverted;
  });
});