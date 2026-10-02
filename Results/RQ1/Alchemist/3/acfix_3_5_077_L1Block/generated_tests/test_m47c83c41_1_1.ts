import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - m47c83c41", function () {
  it("should allow the depositor account to set L1 block values (original behavior), but mutant reverts", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy L1Block contract (no constructor arguments besides the Semver ones which are hardcoded)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The depositor account is a hardcoded address in the contract
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    
    // We need to impersonate the depositor account to call setL1BlockValues
    // First, set the balance for the impersonated account
    await ethers.provider.send("hardhat_setBalance", [
      DEPOSITOR_ACCOUNT,
      "0x1000000000000000000" // 1 ETH in hex
    ]);
    
    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);
    
    // Prepare test values
    const _number = 1;
    const _timestamp = 1000;
    const _basefee = ethers.parseEther("0.001");
    const _hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const _sequenceNumber = 0;
    const _batcherHash = ethers.hexlify(ethers.randomBytes(32));
    const _l1FeeOverhead = 100;
    const _l1FeeScalar = 200;
    
    // Call setL1BlockValues from the depositor account
    // Original: should succeed (no revert)
    // Mutant: should revert because it uses != instead of ==
    const tx = instance.connect(depositorSigner).setL1BlockValues(
      _number,
      _timestamp,
      _basefee,
      _hash,
      _sequenceNumber,
      _batcherHash,
      _l1FeeOverhead,
      _l1FeeScalar
    );
    
    // On the original contract, this should not revert
    // On the mutant, this WILL revert because the depositor is now blocked
    await expect(tx).to.not.be.reverted;
    
    // Clean up - stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});