import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant me950a1d8 - buyShares baseInput calculation", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let baseToken: any;
  let quoteToken: any;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const BASE_DECIMALS = 18;
  const QUOTE_DECIMALS = 18;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", BASE_DECIMALS);
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", QUOTE_DECIMALS);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Mint tokens to owner
    await baseToken.mint(owner.address, INITIAL_SUPPLY);
    await quoteToken.mint(owner.address, INITIAL_SUPPLY);

    // Deploy GSPFunding with required constructor arguments
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    instance = await GSPFundingFactory.deploy(
      owner.address,
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      1000, // _MT_FEE_RATE_
      100,  // _LP_FEE_RATE_
      ethers.parseEther("1"), // _I_
      ethers.parseEther("0.5"), // _K_
      false // _IS_OPEN_TWAP_
    );
    await instance.waitForDeployment();

    // Transfer tokens to contract for initial liquidity
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));
  });

  it("should correctly calculate baseInput as baseBalance - baseReserve when buying shares", async function () {
    // Get initial state
    const initialBaseReserve = await instance._BASE_RESERVE_();
    const initialBaseBalance = await baseToken.balanceOf(await instance.getAddress());
    
    // Transfer additional base tokens to contract (simulating deposit)
    const depositAmount = ethers.parseEther("500");
    await baseToken.transfer(await instance.getAddress(), depositAmount);

    // Calculate expected baseInput using subtraction (original logic)
    const baseBalanceAfter = await baseToken.balanceOf(await instance.getAddress());
    const expectedBaseInput = baseBalanceAfter - initialBaseReserve;

    // Call buyShares and get the baseInput from the return value
    const tx = await instance.connect(addr1).buyShares(addr1.address);
    const receipt = await tx.wait();
    
    // Get the emitted BuyShares event to verify baseInput
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = instance.interface.parseLog(log);
        return parsed.name === "BuyShares";
      } catch {
        return false;
      }
    });
    
    const parsedEvent = instance.interface.parseLog(event);
    const actualBaseInput = parsedEvent.args.baseInput;

    // The mutant would compute baseInput as baseBalance / baseReserve (division)
    // For deposit of 500 with reserve of 1000: 
    //   Original: 1500 - 1000 = 500
    //   Mutant: 1500 / 1000 = 1.5 (in wei, but still wrong)
    // The mutant's division would produce a much smaller value
    expect(actualBaseInput).to.equal(expectedBaseInput);
    expect(actualBaseInput).to.equal(depositAmount);
    
    // Verify the mutant would fail by checking division result
    const mutantResult = baseBalanceAfter / initialBaseReserve;
    expect(actualBaseInput).to.not.equal(mutantResult);
  });
});