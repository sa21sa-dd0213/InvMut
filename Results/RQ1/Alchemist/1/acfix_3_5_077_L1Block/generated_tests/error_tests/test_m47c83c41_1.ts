import { expect } from "chai";
import { ethers } } from "hardhat";

describe("L1Block mutant kill test - m47c83c41", function () {
  it("should allow the depositor account to call setL1BlockValues successfully (detect mutant that flips == to !=)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The depositor account is a constant address, we need to impersonate it
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Set balance for the depositor account to pay gas
    await ethers.provider.send("hardhat_setBalance", [
      DEPOSITOR_ACCOUNT,
      "0x1000000000000000000", // 1 ETH
    ]);

    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Prepare test values
    const _number = 1;
    const _timestamp = 1000;
    const _basefee = ethers.parseEther("0.001");
    const _hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const _sequenceNumber = 5;
    const _batcherHash = ethers.keccak256(ethers.toUtf8Bytes("batch"));
    const _l1FeeOverhead = 100;
    const _l1FeeScalar = 200;

    // This should succeed on original (depositor can call), but revert on mutant due to != check
    // We expect it to NOT revert on the original, so the test passes on original and fails on mutant
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        _number,
        _timestamp,
        _basefee,
        _hash,
        _sequenceNumber,
        _batcherHash,
        _l1FeeOverhead,
        _l1FeeScalar
      )
    ).to.not.be.reverted;

    // Verify state was updated (optional but good practice)
    expect(await instance.number()).to.equal(_number);
    expect(await instance.timestamp()).to.equal(_timestamp);
    expect(await instance.basefee()).to.equal(_basefee);
    expect(await instance.hash()).to.equal(_hash);
    expect(await instance.sequenceNumber()).to.equal(_sequenceNumber);
    expect(await instance.batcherHash()).to.equal(_batcherHash);
    expect(await instance.l1FeeOverhead()).to.equal(_l1FeeOverhead);
    expect(await instance.l1FeeScalar()).to.equal(_l1FeeScalar);

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});