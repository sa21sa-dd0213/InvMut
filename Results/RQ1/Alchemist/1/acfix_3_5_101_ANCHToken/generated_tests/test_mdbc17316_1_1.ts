import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant mdbc17316 test", function () {
  it("should revert when non-allowed addresses try to transfer, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with a mock router address (any address works for the test since we won't use Uniswap)
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();
    
    // Get the token contract address
    const tokenAddress = await instance.getAddress();
    
    // Transfer some tokens to addr1 so they have balance to transfer
    // Owner is automatically the minter, so owner has all tokens initially
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);
    
    // Now attempt a transfer from addr1 to addr2 (both non-allowed)
    // In original contract this should revert with "Unauthorized role"
    // In mutant this should succeed because the require is removed
    const tx = instance.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));
    
    // We expect the original to revert, so the test expects revert
    // This will pass on original but fail on mutant (killing the mutant)
    await expect(tx).to.be.revertedWith("Unauthorized role");
  });
});