import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m6d085049 kill test", function () {
  it("should detect the mutant by causing a revert when depositing into an account with max-1 balance", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy PrivateBank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bankInstance = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Get the maximum uint256 value
    const MAX_UINT = ethers.MaxUint256;
    
    // Set the user's balance to MAX_UINT - 1 by direct storage manipulation
    // First, get the storage slot for balances[owner.address]
    // balances mapping slot is 0 (first declared variable)
    const slot = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [owner.address, 0]
    );
    
    // Set the storage slot to MAX_UINT - 1
    await ethers.provider.send("hardhat_setStorageAt", [
      await bankInstance.getAddress(),
      slot,
      ethers.toBeHex(MAX_UINT - 1n, 32)
    ]);
    
    // Verify the balance is set correctly
    expect(await bankInstance.balances(owner.address)).to.equal(MAX_UINT - 1n);
    
    // Now try to deposit 1 wei
    // In the original contract this would succeed
    // In the mutant: (MAX_UINT - 1) + 1 + 1 = MAX_UINT + 1 which overflows to 0
    // 0 >= MAX_UINT - 1 is false, so it should revert
    const tx = bankInstance.Deposit({ value: ethers.parseEther("1") });
    
    // The transaction should revert due to the mutant's faulty overflow check
    await expect(tx).to.be.reverted;
  });
});