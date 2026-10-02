import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant m3e78966b - Deposit require change", function () {
  it("should revert when depositing non-zero ether due to == instead of >=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile separately as it's not part of the constructor
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(1);
    await instance.connect(owner).Initialized();

    // Try to deposit 1 wei - should revert with the mutant
    await expect(
      instance.connect(addr1).Deposit({ value: ethers.parseEther("0.001") })
    ).to.be.reverted;
  });
});