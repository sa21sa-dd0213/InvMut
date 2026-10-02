import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken mutant detection - overflow guard", function () {
  it("should revert when transfer causes recipient balance overflow (detects mutant m085f1731)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with initial supply that allows overflow scenario
    // We need to set up balances so that addr1 has enough tokens and addr2's balance is close to max uint256
    const initialSupply = ethers.parseEther("1000"); // 1000 tokens (18 decimals)
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const token = await Factory.deploy(initialSupply, "TestToken", "TT");
    await token.waitForDeployment();

    // First transfer some tokens to addr2 to bring its balance close to overflow
    // We'll transfer enough so that adding _value causes uint256 overflow
    const maxUint256 = ethers.MaxUint256;
    const transferAmount1 = maxUint256 - ethers.parseEther("1"); // Almost max uint256
    // But we don't have that many tokens, so we need to mint first
    // Mint tokens to owner to have enough
    await token.mintToken(owner.address, maxUint256);
    
    // Now transfer from owner to addr2 to set addr2's balance near max
    await token.transfer(addr2.address, maxUint256 - ethers.parseEther("1"));
    
    // Now addr2's balance is maxUint256 - 1 ether
    // Transfer 1 wei to addr1 so addr1 has tokens to send back
    await token.transfer(addr1.address, ethers.parseEther("1"));
    
    // Now try to transfer from addr1 to addr2 an amount that will cause overflow
    // addr2's balance = maxUint256 - 1e18, sending 2e18 should overflow
    const overflowAmount = ethers.parseEther("2");
    
    // This should revert in original contract due to overflow check
    // The mutant would allow it (wrongly) because > instead of >=
    await expect(
      token.connect(addr1).transfer(addr2.address, overflowAmount)
    ).to.be.reverted;
  });
});