import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test", function () {
  it("should kill mutant mee936704 by calling setL1BlockValues from the contract's own address", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the deployed contract address
    const contractAddress = await instance.getAddress();

    // Impersonate the contract itself (since mutant sets DEPOSITOR_ACCOUNT = address(this))
    await ethers.provider.send("hardhat_impersonateAccount", [contractAddress]);
    const contractSigner = await ethers.getSigner(contractAddress);

    // Fund the contract address to pay for gas
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });

    // This should revert on the original (contract address != 0xDeaD...0001)
    // but succeed on the mutant (contract address == address(this) == DEPOSITOR_ACCOUNT)
    await expect(
      instance.connect(contractSigner).setL1BlockValues(
        1,           // _number
        100,         // _timestamp
        ethers.parseEther("1"),  // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        1,           // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        ethers.parseEther("0.1"), // _l1FeeOverhead
        ethers.parseEther("0.01") // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [contractAddress]);
  });
});