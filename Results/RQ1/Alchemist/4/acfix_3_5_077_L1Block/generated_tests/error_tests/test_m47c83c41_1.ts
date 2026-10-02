import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant m47c83c41 test", function () {
  it("should revert when depositor account calls setL1BlockValues due to inverted access control", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the DEPOSITOR_ACCOUNT address from the contract
    const DEPOSITOR_ACCOUNT = await instance.DEPOSITOR_ACCOUNT();
    
    // Impersonate the depositor account (needed for Hardhat local network)
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);
    
    // Fund the depositor account with some ETH for gas
    await owner.sendTransaction({
      to: DEPOSITOR_ACCOUNT,
      value: ethers.parseEther("1.0")
    });
    
    // Prepare test values
    const testValues = {
      _number: 1,
      _timestamp: 1000,
      _basefee: ethers.parseEther("0.01"),
      _hash: ethers.hexlify(ethers.randomBytes(32)),
      _sequenceNumber: 1,
      _batcherHash: ethers.hexlify(ethers.randomBytes(32)),
      _l1FeeOverhead: 100,
      _l1FeeScalar: 200
    };
    
    // In the original contract, this call from DEPOSITOR_ACCOUNT should succeed
    // In the mutant (with !=), this call from DEPOSITOR_ACCOUNT should revert
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        testValues._number,
        testValues._timestamp,
        testValues._basefee,
        testValues._hash,
        testValues._sequenceNumber,
        testValues._batcherHash,
        testValues._l1FeeOverhead,
        testValues._l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
    
    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});