import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m156281fa - distributeToken balance check", function () {
  it("should kill the mutant when balance exactly equals distributeAmount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Get the contract address
    const contractAddress = await instance.getAddress();

    // Set the caller (cfo) to be able to call distributeToken and setDistributeAddress
    await instance.setCaller(owner.address);

    // Set a distribute address
    await instance.setDistributeAddress(addr2.address);

    // Get the distributeAmount (2000 * 1e18)
    const distributeAmount = ethers.parseEther("2000");

    // Transfer tokens to the contract so that balance equals distributeAmount exactly
    // First mint some tokens to owner (already done in constructor)
    // Then transfer exactly distributeAmount to the contract
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.be.gte(distributeAmount);

    // Transfer exactly distributeAmount to the contract itself
    await instance.transfer(contractAddress, distributeAmount);

    // Verify the contract balance is exactly distributeAmount
    const contractBalance = await instance.balanceOf(contractAddress);
    expect(contractBalance).to.equal(distributeAmount);

    // Call distributeToken - this should succeed on original but fail on mutant
    // because mutant requires balance > distributeAmount (strictly greater)
    await expect(instance.distributeToken()).to.not.be.reverted;

    // Verify the transfer happened
    const finalContractBalance = await instance.balanceOf(contractAddress);
    expect(finalContractBalance).to.equal(0);

    const distributeAddressBalance = await instance.balanceOf(addr2.address);
    expect(distributeAddressBalance).to.equal(distributeAmount);
  });
});