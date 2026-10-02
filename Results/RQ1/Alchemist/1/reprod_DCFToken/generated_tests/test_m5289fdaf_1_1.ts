import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m5289fdaf - setDistributeAddress", function () {
  it("should kill mutant by verifying distributeAddress is set correctly after calling setDistributeAddress", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr2.address;

    // Deploy DCF contract
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set the caller (cfo) to owner address
    await instance.setCaller(owner.address);

    // Set a valid distribute address
    const validDistributeAddress = addr1.address;
    await instance.setDistributeAddress(validDistributeAddress);

    // Check that distributeAddress is set to the valid address, not address(0)
    // We need to check the internal state - we can do this by trying to distribute
    // First, we need to ensure the contract has tokens to distribute
    // Mint some tokens to the contract (the owner has the initial supply)
    const distributeAmount = ethers.parseEther("2000");

    // Transfer tokens to the contract so it has balance for distribution
    await instance.transfer(await instance.getAddress(), distributeAmount);

    // Now call distributeToken() - it should succeed if distributeAddress is valid
    // In the mutant, distributeAddress will be address(0) and this will revert
    await expect(instance.distributeToken()).to.not.be.reverted;

    // Additional verification: check that the tokens were actually transferred to addr1
    const balanceAfter = await instance.balanceOf(validDistributeAddress);
    expect(balanceAfter).to.equal(distributeAmount);
  });
});