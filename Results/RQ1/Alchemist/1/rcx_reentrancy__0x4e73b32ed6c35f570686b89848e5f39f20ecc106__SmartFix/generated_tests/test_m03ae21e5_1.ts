import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test for m03ae21e5", function () {
  it("should revert when Collect fails due to recipient contract rejecting ether", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy LogFile first since PRIVATE_ETH_CELL needs it
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Fund addr1 with sufficient balance
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("1") });
    
    // Create a contract that will reject ether
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Attempt Collect to the rejecting contract - should revert in original
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"), {
        value: 0,
        to: await rejector.getAddress()
      })
    ).to.be.reverted;
    
    // Verify balance was NOT deducted (would be deducted in mutant)
    const balanceAfter = await instance.balances(addr1.address);
    expect(balanceAfter).to.equal(ethers.parseEther("1"));
  });
});

// Helper contract that rejects ether
contract Rejector {
  receive() external payable {
    revert("I reject ether");
  }
}