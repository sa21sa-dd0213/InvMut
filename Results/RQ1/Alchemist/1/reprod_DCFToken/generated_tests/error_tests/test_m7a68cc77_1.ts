import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m7a68cc77 - burnPair zero amount", function () {
  it("should not emit Transfer event when burnPair is called with _deadAmount = 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr1.address;
    
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.attach(await instance.getAddress());
    
    // Get the pair address from the deployed contract
    const pairAddress = await dcf.pairAddress();
    
    // Get the initial balance of the pair to verify no burn occurs
    const initialPairBalance = await dcf.balanceOf(pairAddress);
    
    // We need to trigger the burnPair function with _deadAmount = 0
    // This happens when balanceOf(pairAddress) <= deadAmount in the _transfer function
    // Since deadAmount = (amount - fee) / deadCfg, and deadCfg = 2
    // If balanceOf(pairAddress) <= deadAmount, the burnPair is called with _deadAmount = 0
    
    // First, let's set up the conditions to trigger a sell to pairAddress
    // We need to transfer tokens to the pair so it has some balance
    const transferAmount = ethers.parseEther("100");
    await dcf.transfer(pairAddress, transferAmount);
    
    // Now the pair has 100 tokens, so deadAmount would need to be >= 100 to trigger burn with 0
    // Let's get the current balance
    const pairBalance = await dcf.balanceOf(pairAddress);
    
    // To test the mutant, we need to check if a Transfer event is emitted when _deadAmount = 0
    // The original code would skip the burn (no event), the mutant would emit Transfer with 0
    
    // Listen for Transfer events from the pair address
    await expect(
      // Trigger a transfer that results in deadAmount = 0
      // This happens when we sell tokens and balanceOf(pairAddress) <= deadAmount
      // We need to set up a sell transaction
      dcf.connect(owner).transfer(
        pairAddress,
        ethers.parseEther("1")
      )
    ).to.not.emit(dcf, "Transfer")
     .withArgs(pairAddress, ethers.constants.AddressZero, 0);
    
    // Verify the pair balance hasn't changed (no burn occurred)
    const finalPairBalance = await dcf.balanceOf(pairAddress);
    expect(finalPairBalance).to.equal(pairBalance);
  });
});