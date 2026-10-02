import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - m2fa47cb0", function () {
  it("should kill mutant that inverts zero-address check by transferring to a valid non-zero address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy ANCHToken with constructor arguments
    // The constructor requires: address _route, address _USDToken
    // We'll use a mock UniswapV2Router address (any address works for testing)
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();

    // Get the initial balance of addr1
    const initialBalance = await instance.balanceOf(addr1.address);
    
    // Transfer tokens from owner to addr1 (valid non-zero address)
    const transferAmount = ethers.parseEther("100");
    const tx = await instance.transfer(addr1.address, transferAmount);
    await tx.wait();
    
    // Verify the transfer succeeded by checking the balance increased
    const finalBalance = await instance.balanceOf(addr1.address);
    
    // On the original contract, this transfer should succeed and balance should increase
    // On the mutant (which requires recipient == address(0)), this transfer should revert
    // If the transfer succeeded, we've detected the mutant is the original (test passes)
    // If the transfer reverts, we've detected the mutant (test fails - kills the mutant)
    expect(finalBalance).to.equal(initialBalance + transferAmount);
  });
});