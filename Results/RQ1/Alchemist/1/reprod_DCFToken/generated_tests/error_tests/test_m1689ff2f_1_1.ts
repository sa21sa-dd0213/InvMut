import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - m1689ff2f", function () {
  it("should kill mutant that hardcodes distributeAddress instead of using parameter", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Set caller (cfo) to owner so we can call setDistributeAddress
    await instance.setCaller(owner.address);

    // Set distribute address to addr2
    await instance.setDistributeAddress(addr2.address);

    // Mint some tokens to the contract for distribution
    // First get the initial supply to owner
    const initialSupply = await instance.totalSupply();

    // Transfer some tokens to the contract address for distribution
    await instance.transfer(await instance.getAddress(), ethers.parseEther("10000"));

    // Now call distributeToken - this should send tokens to addr2
    const contractAddress = await instance.getAddress();
    const balanceBefore = await instance.balanceOf(addr2.address);

    await instance.distributeToken();

    const balanceAfter = await instance.balanceOf(addr2.address);

    // If the mutant is alive (hardcoded address), tokens would go to the hardcoded address
    // which is 0x56f46bD073E9978Eb6984C0c3e5c661407c3A447, not addr2
    // So addr2's balance should have increased by distributeAmount (2000 tokens)
    const expectedIncrease = ethers.parseEther("2000");

    // This assertion will pass on original (tokens go to addr2) 
    // but fail on mutant (tokens go to hardcoded address instead)
    expect(balanceAfter - balanceBefore).to.equal(expectedIncrease);
  });
});