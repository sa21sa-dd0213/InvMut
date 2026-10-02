import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - Transfer event on mint", function () {
  it("should emit Transfer event from zero address to owner on deployment for initial mint", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock Uniswap router and USD token to satisfy constructor requirements
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSD = await MockERC20.deploy();
    await mockUSD.waitForDeployment();

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      await mockRouter.getAddress(),
      await mockUSD.getAddress()
    );
    await instance.waitForDeployment();

    // Get the deployed token address
    const tokenAddress = await instance.getAddress();

    // The Transfer event from zero address should be emitted during deployment
    // Get the events from the deployment transaction
    const deployTx = instance.deploymentTransaction();
    const receipt = await deployTx?.wait();

    // Find Transfer events with from = address(0)
    const transferEvents = receipt?.logs
      .filter(log => {
        try {
          const parsedLog = instance.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          return parsedLog?.name === "Transfer" && 
                 parsedLog?.args?.from === ethers.ZeroAddress && 
                 parsedLog?.args?.to === owner.address;
        } catch {
          return false;
        }
      });

    // The mutant removes this event, so if no such event is found, the mutant is detected
    expect(transferEvents?.length).to.be.greaterThan(0);
    if (transferEvents && transferEvents.length > 0) {
      const mintAmount = ethers.parseEther("10000000"); // 10 million * 10^18
      expect(transferEvents[0].args.value).to.equal(mintAmount);
    }
  });
});