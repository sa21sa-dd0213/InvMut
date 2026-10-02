import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - setDistributeAddress", function () {
  it("should kill mutant m59a9b714 by verifying distributeAddress is set correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with required constructor arguments
    // Constructor takes _liquidityReceiveAddress
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();

    // First, set the caller (cfo) to owner so we can call setDistributeAddress
    await instance.setCaller(owner.address);

    // Call setDistributeAddress with a specific address (different from router address 0x10ED43C718714eb63d5aA57B78B54704E256024E)
    const testAddress = "0x0000000000000000000000000000000000000001";
    await instance.setDistributeAddress(testAddress);

    // Verify that distributeAddress is set to the test address, not the hardcoded router address
    // We need to check this indirectly by calling distributeToken and checking where tokens go
    // First, mint some tokens to the contract for distribution
    // Get the contract's token balance first
    const initialBalance = await instance.balanceOf(await instance.getAddress());

    // Transfer tokens to contract to ensure it has enough for distribution
    const distributeAmount = ethers.parseEther("2000");
    if (initialBalance < distributeAmount) {
      // Owner should have tokens from initial mint
      await instance.transfer(await instance.getAddress(), distributeAmount - initialBalance);
    }

    // Now call distributeToken which should send tokens to testAddress
    await instance.distributeToken();

    // Check that tokens went to testAddress, not the router address
    const testAddressBalance = await instance.balanceOf(testAddress);
    const routerBalance = await instance.balanceOf("0x10ED43C718714eb63d5aA57B78B54704E256024E");

    // On the original contract, tokens should go to testAddress
    // On the mutant, tokens would go to router address instead
    expect(testAddressBalance).to.equal(distributeAmount);
    expect(routerBalance).to.equal(0);
  });
});