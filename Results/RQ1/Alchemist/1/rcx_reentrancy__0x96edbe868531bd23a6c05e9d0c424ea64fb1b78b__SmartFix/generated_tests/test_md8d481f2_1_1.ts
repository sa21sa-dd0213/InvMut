import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant md8d481f2 test", function () {
  it("should revert when Collect is called with a failing external call but mutant incorrectly treats it as success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the LogFile contract first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract
    await instance.SetMinSum(ethers.parseEther("1"));
    await instance.SetLogFile(await logFile.getAddress());
    await instance.Initialized();
    
    // Create a contract that will reject ETH
    const Rejector = await ethers.getContractFactory(
      "contract RejectETH { receive() external payable { revert(); } }"
    );
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();
    
    // addr1 puts funds into the contract
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("2") });
    
    // addr1 tries to collect 1 ETH to the rejector contract - this should revert
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});